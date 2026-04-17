from django.views.generic import TemplateView


class SharedFundListView(TemplateView):
    template_name = 'shared_fund/fund_list.html'


class SharedFundDetailView(TemplateView):
    template_name = 'shared_fund/fund_detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['fund_id'] = kwargs.get('fund_id')
        return context
