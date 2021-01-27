# This file is part of Indico.
# Copyright (C) 2002 - 2020 CERN
#
# Indico is free software; you can redistribute it and/or
# modify it under the terms of the MIT License; see the
# LICENSE file for more details.
from marshmallow import post_dump

from indico.core.marshmallow import mm
from indico.modules.categories import Category
from indico.modules.events import Event
from indico.web.flask.util import url_for


class CategorySchema(mm.SQLAlchemyAutoSchema):
    class Meta:
        model = Category
        fields = ('id', 'title', 'url')

    url = mm.Function(lambda c: url_for('categories.display', category_id=c['id']))


class DetailedCategorySchema(mm.SQLAlchemyAutoSchema):
    class Meta:
        fields = ('id', 'title', 'url', 'path')

    path = mm.List(mm.Nested(CategorySchema), attribute='chain')

    @post_dump()
    def update_path(self, c, **kwargs):
        c['path'] = c['path'][:-1]
        return c


class PersonSchema(mm.Schema):
    id = mm.Int()
    name = mm.Function(lambda e: f'{e.title} {e.name}')
    affiliation = mm.String()


class LocationSchema(mm.Schema):
    venue_name = mm.String()
    room_name = mm.String()
    address = mm.String()


class EventSchema(mm.SQLAlchemyAutoSchema):
    class Meta:
        model = Event
        fields = ('id', 'title', 'description', 'url', 'type', 'keywords', 'category_path', 'chair_persons',
                  'location', 'creation_dt', 'start_dt', 'end_dt')

    location = mm.Function(lambda event: LocationSchema().dump(event))
    chair_persons = mm.List(mm.Nested(PersonSchema), attribute='person_links')
    category_path = mm.List(mm.Nested(CategorySchema), attribute='detailed_category_chain')


class BaseSchema(mm.Schema):
    id = mm.Int()
    title = mm.String()
    url = mm.String()
    persons = mm.Nested(PersonSchema, many=True)


class ContributionSchema(BaseSchema):
    start_dt = mm.String()
    eventURL = mm.String()
    eventTitle = mm.String()


class AttachmentSchema(BaseSchema):
    type = mm.String()
    contributionTitle = mm.String()
    date = mm.String()
    contribURL = mm.String()


class ResultSchema(mm.Schema):
    page = mm.Int(required=True)
    pages = mm.Int(required=True)
    total = mm.Int(required=True)


class CategoryResultSchema(ResultSchema):
    results = mm.Nested(DetailedCategorySchema, required=True, many=True, attribute='items')


class EventResultSchema(ResultSchema):
    results = mm.Nested(EventSchema, required=True, many=True, attribute='items')
